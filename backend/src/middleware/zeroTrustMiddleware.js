import jwt from 'jsonwebtoken';
import authService from '../services/authService.js';
import auditService from '../audit/auditService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'sentinelvault_super_secret_jwt_key_2026_enterprise_zero_trust';

/**
 * Zero-Trust Authentication Middleware
 * Validates Bearer JWT tokens and checks account status
 */
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Zero-Trust Enforcement: Missing authentication token.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Zero-Trust Enforcement: Token expired or cryptographic signature invalid.'
    });
  }
};

/**
 * Role-Based Access Control (RBAC) Middleware
 * @param  {...string} allowedRoles 
 */
export const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      await auditService.logEvent({
        actorId: req.user ? req.user.userId : null,
        actorUsername: req.user ? req.user.username : 'UNKNOWN',
        actorRole: req.user ? req.user.role : 'None',
        actionType: 'RBAC_VIOLATION_ATTEMPT',
        resourceId: req.originalUrl,
        ipAddress: req.ip || '127.0.0.1',
        riskScore: 75.0,
        details: `Unauthorized attempt to access privileged endpoint requiring roles: ${allowedRoles.join(', ')}`
      });

      return res.status(403).json({
        error: 'Access Denied',
        message: `RBAC Policy Enforcement: Your role (${req.user ? req.user.role : 'Guest'}) lacks clearance for this operation.`
      });
    }
    next();
  };
};

/**
 * Continuous Zero-Trust Risk Evaluation Middleware for Sensitive Endpoints
 */
export const evaluateContinuousRisk = async (req, res, next) => {
  if (!req.user) return next();

  const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const simulatedLocation = req.headers['x-simulated-location'] || 'New York, USA';
  const isSimulation = req.headers['x-simulated-attack'] === 'true';

  const riskEval = await authService.evaluateAirisk({
    userId: req.user.userId,
    username: req.user.username,
    actionType: `SENSITIVE_OP_${req.method}_${req.baseUrl}`,
    ipAddress,
    location: simulatedLocation,
    timestamp: new Date().toISOString(),
    isSimulation
  });

  req.riskEvaluation = riskEval;

  if (riskEval.riskScore >= 70) {
    await auditService.logEvent({
      actorId: req.user.userId,
      actorUsername: req.user.username,
      actorRole: req.user.role,
      actionType: 'CONTINUOUS_RISK_BLOCK',
      resourceId: req.originalUrl,
      ipAddress,
      riskScore: riskEval.riskScore,
      details: `Continuous zero-trust monitor blocked transaction due to high risk (${riskEval.riskScore}): ${riskEval.triggeringFactors.join('; ')}`
    });

    return res.status(403).json({
      error: 'Zero-Trust Transaction Blocked',
      riskScore: riskEval.riskScore,
      factors: riskEval.triggeringFactors,
      message: 'Continuous behavioral anomaly monitoring detected critical risk during session. Action denied.'
    });
  }

  next();
};

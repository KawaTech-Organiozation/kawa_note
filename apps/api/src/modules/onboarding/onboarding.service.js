import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { createUserCredentialsSchema, selectPlanSchema } from './onboarding.schema.js';

/**
 * Generate access + refresh tokens for a user.
 * @param {string} userId
 * @param {string} tenantId
 * @returns {{ accessToken: string, refreshToken: string }}
 */
function generateTokens(userId, tenantId) {
  const accessToken = jwt.sign(
    { userId, tenantId, type: 'access' },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { userId, tenantId, type: 'refresh' },
    env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  return { accessToken, refreshToken };
}

/**
 * Onboarding Service
 * Handles business logic for onboarding flow
 */
export const onboardingService = {
  /**
   * Create user credentials (STEP 2) — PUBLIC
   * The user does not exist yet. This method creates it.
   * @param {Object} data - { tenantId, name, email, phone, password }
   * @returns {Promise<{ userId: string, tenantId: string, accessToken: string, refreshToken: string }>}
   */
  async createUserCredentials(data) {
    // Validate input (includes tenantId)
    const validatedData = createUserCredentialsSchema.parse(data);

    // Verify tenant exists and is at STEP_1
    const tenant = await prisma.tenant.findUnique({
      where: { tenantId: validatedData.tenantId }
    });

    if (!tenant) {
      const error = new Error('Tenant não encontrado');
      error.code = 'TENANT_NOT_FOUND';
      throw error;
    }

    if (tenant.onboardingStep !== 'STEP_1') {
      const error = new Error('Tenant já possui usuário cadastrado');
      error.code = 'TENANT_STEP_INVALID';
      throw error;
    }

    // Check if email is already in use
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existingUser) {
      const error = new Error('Email já está em uso');
      error.code = 'EMAIL_IN_USE';
      throw error;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Create user linked to tenant
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        tenantId: validatedData.tenantId
      },
      select: {
        id: true,
        email: true,
        name: true,
        tenantId: true,
        createdAt: true
      }
    });

    // Update tenant with phone and advance to STEP_2
    await prisma.tenant.update({
      where: { tenantId: validatedData.tenantId },
      data: {
        mobilePhone: validatedData.phone,
        onboardingStep: 'STEP_2'
      }
    });

    // Generate tokens
    const tokens = generateTokens(user.id, user.tenantId);

    return {
      userId: user.id,
      tenantId: user.tenantId,
      ...tokens
    };
  },

  /**
   * Get available plans from database (subscription_plans table).
   * Populated via prisma/seed-plans.js — must run on DB-INIT.
   * @returns {Promise<Array>} List of active plans ordered by price
   */
  async getPlans() {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { priceMonthly: 'asc' },
      select: {
        planId: true,
        planName: true,
        maxCompanies: true,
        maxUsers: true,
        maxCustomers: true,
        maxStorageGb: true,
        priceMonthly: true,
        features: true
      }
    });

    if (plans.length === 0) {
      const error = new Error('Nenhum plano disponível. Execute seed-plans.js no DB-INIT.');
      error.code = 'NO_PLANS_AVAILABLE';
      throw error;
    }

    // Normalize to plain JS types expected by the frontend.
    // priceMonthly comes as Prisma Decimal (not a JS number) — convert to float.
    // Rename planId→id and planName→name to match the existing frontend contract.
    return plans.map((plan) => ({
      id: plan.planId,
      name: plan.planName,
      maxCompanies: plan.maxCompanies,
      maxUsers: plan.maxUsers,
      maxCustomers: plan.maxCustomers,
      maxStorageGb: plan.maxStorageGb,
      priceMonthly: parseFloat(plan.priceMonthly),
      features: plan.features
    }));
  },

  /**
   * Select plan (STEP 3)
   * @param {string} userId - User ID
   * @param {Object} data - Plan selection data
   * @returns {Promise<Object>} Updated tenant
   */
  async selectPlan(userId, data) {
    // Validate input
    const validatedData = selectPlanSchema.parse(data);

    // Get user with tenant
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true }
    });

    if (!user) {
      const error = new Error('Usuário não encontrado');
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    if (!user.tenantId) {
      const error = new Error('Tenant não encontrado');
      error.code = 'TENANT_NOT_FOUND';
      throw error;
    }

    // Deactivate existing plans
    await prisma.tenantPlan.updateMany({
      where: { tenantId: user.tenantId, active: true },
      data: { active: false }
    });

    // Fetch selected plan from database
    const selectedPlan = await prisma.subscriptionPlan.findUnique({
      where: { planName: validatedData.planName }
    });

    if (!selectedPlan || !selectedPlan.active) {
      const error = new Error('Plano não encontrado');
      error.code = 'PLAN_NOT_FOUND';
      throw error;
    }

    await prisma.tenantPlan.create({
      data: {
        tenantId: user.tenantId,
        planName: selectedPlan.planName,
        maxCompanies: selectedPlan.maxCompanies,
        maxUsers: selectedPlan.maxUsers,
        maxCustomers: selectedPlan.maxCustomers,
        maxStorageGb: selectedPlan.maxStorageGb,
        priceMonthly: selectedPlan.priceMonthly,
        features: selectedPlan.features,
        active: true
      }
    });

    // Update tenant step
    const tenant = await prisma.tenant.update({
      where: { tenantId: user.tenantId },
      data: {
        onboardingStep: 'STEP_3'
      }
    });

    return tenant;
  },

  /**
   * Complete onboarding (STEP 4)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated tenant
   */
  async completeOnboarding(userId) {
    // Get user with tenant
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true }
    });

    if (!user) {
      const error = new Error('Usuário não encontrado');
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    if (!user.tenantId) {
      const error = new Error('Tenant não encontrado');
      error.code = 'TENANT_NOT_FOUND';
      throw error;
    }

    // Verify all steps are completed
    const tenant = user.tenant;
    if (tenant.onboardingStep !== 'STEP_3') {
      const error = new Error('Onboarding não foi completado em todos os steps');
      error.code = 'ONBOARDING_INCOMPLETE';
      throw error;
    }

    // Complete onboarding
    const updatedTenant = await prisma.tenant.update({
      where: { tenantId: user.tenantId },
      data: {
        onboardingStep: 'STEP_4',
        onboardingStatus: 'COMPLETED',
        isActive: true
      }
    });

    return updatedTenant;
  }
};

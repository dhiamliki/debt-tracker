package com.dhiamliki.debttracker.plan;

import com.dhiamliki.debttracker.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class SavedPlanService {

    private final SavedPlanRepository savedPlanRepository;

    public SavedPlanService(SavedPlanRepository savedPlanRepository) {
        this.savedPlanRepository = savedPlanRepository;
    }

    @Transactional(readOnly = true)
    public List<SavedPlanResponse> getPlansForUser(UUID userId) {
        return savedPlanRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(SavedPlanResponse::from)
                .toList();
    }

    @Transactional
    public SavedPlanResponse createPlan(UUID userId, SavePlanRequest request) {
        SavedPlan plan = new SavedPlan();
        plan.setUserId(userId);
        plan.setName(request.getName());
        plan.setMonthlyBudget(request.getMonthlyBudget());
        plan.setDebtsSnapshot(request.getDebtsSnapshot().toString());
        plan.setSnowballResult(
                request.getSnowballResult() != null ? request.getSnowballResult().toString() : null);
        plan.setAvalancheResult(
                request.getAvalancheResult() != null ? request.getAvalancheResult().toString() : null);
        return SavedPlanResponse.from(savedPlanRepository.save(plan));
    }

    @Transactional
    public void deletePlan(UUID userId, UUID planId) {
        long deleted = savedPlanRepository.deleteByIdAndUserId(planId, userId);
        if (deleted == 0) {
            throw new ResourceNotFoundException("Plan not found");
        }
    }
}

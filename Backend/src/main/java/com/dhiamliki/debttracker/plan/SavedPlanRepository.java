package com.dhiamliki.debttracker.plan;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SavedPlanRepository extends JpaRepository<SavedPlan, UUID> {

    List<SavedPlan> findByUserIdOrderByCreatedAtDesc(UUID userId);

    long deleteByIdAndUserId(UUID id, UUID userId);
}

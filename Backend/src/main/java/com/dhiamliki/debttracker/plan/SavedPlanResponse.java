package com.dhiamliki.debttracker.plan;

import com.fasterxml.jackson.annotation.JsonRawValue;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Plan as returned to the client. The JSON columns are emitted verbatim
 * (via {@link JsonRawValue}) so the client receives real JSON, not an
 * escaped string.
 */
public class SavedPlanResponse {

    private UUID id;
    private String name;
    private BigDecimal monthlyBudget;

    @JsonRawValue
    private String debtsSnapshot;

    @JsonRawValue
    private String snowballResult;

    @JsonRawValue
    private String avalancheResult;

    private Instant createdAt;

    public static SavedPlanResponse from(SavedPlan plan) {
        SavedPlanResponse dto = new SavedPlanResponse();
        dto.id = plan.getId();
        dto.name = plan.getName();
        dto.monthlyBudget = plan.getMonthlyBudget();
        dto.debtsSnapshot = plan.getDebtsSnapshot();
        dto.snowballResult = plan.getSnowballResult();
        dto.avalancheResult = plan.getAvalancheResult();
        dto.createdAt = plan.getCreatedAt();
        return dto;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public BigDecimal getMonthlyBudget() {
        return monthlyBudget;
    }

    public String getDebtsSnapshot() {
        return debtsSnapshot;
    }

    public String getSnowballResult() {
        return snowballResult;
    }

    public String getAvalancheResult() {
        return avalancheResult;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}

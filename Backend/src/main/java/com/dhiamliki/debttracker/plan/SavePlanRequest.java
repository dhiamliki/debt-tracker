package com.dhiamliki.debttracker.plan;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class SavePlanRequest {

    @NotBlank
    private String name;

    @NotNull
    private BigDecimal monthlyBudget;

    @NotNull
    private JsonNode debtsSnapshot;

    private JsonNode snowballResult;

    private JsonNode avalancheResult;
}

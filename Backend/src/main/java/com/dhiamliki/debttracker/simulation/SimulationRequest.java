package com.dhiamliki.debttracker.simulation;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class SimulationRequest {

    @NotNull
    @Valid
    private List<DebtInput> debts;

    @NotNull
    private Double monthlyBudget;

    @Data
    public static class DebtInput {

        @NotNull
        private String id;

        @NotNull
        private String name;

        @NotNull
        private Double balance;

        @NotNull
        private Double interestRate;

        @NotNull
        private Double minimumPayment;
    }
}

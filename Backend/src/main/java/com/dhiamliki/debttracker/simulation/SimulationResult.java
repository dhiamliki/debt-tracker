package com.dhiamliki.debttracker.simulation;

import lombok.Data;

import java.util.List;

/**
 * Combined output of one simulation run: the Snowball and Avalanche strategies
 * computed from the same {@link SimulationRequest}.
 */
@Data
public class SimulationResult {

    private StrategyResult snowball;
    private StrategyResult avalanche;

    /** Outcome of a single payoff strategy. */
    @Data
    public static class StrategyResult {
        private double totalInterestPaid;
        private int monthsToPayoff;
        /**
         * True when the monthly budget cannot cover the combined minimum
         * payments (or the plan fails to converge within the month ceiling).
         * When true, {@code totalInterestPaid} and {@code monthsToPayoff} are
         * reported as -1 (the frontend's Infinity has no int representation).
         */
        private boolean unaffordable;
        private List<PayoffEntry> payoffOrder;
        private List<MonthlySnapshot> monthlySnapshots;
    }

    /** Per-debt outcome, in the order debts were cleared. */
    @Data
    public static class PayoffEntry {
        private String debtId;
        private String name;
        private int paidOffInMonth;
        private double interestPaid;
    }

    /** End-of-month total across all debts. */
    @Data
    public static class MonthlySnapshot {
        private int month;
        private double totalBalance;
    }
}

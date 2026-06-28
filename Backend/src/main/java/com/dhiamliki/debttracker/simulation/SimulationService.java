package com.dhiamliki.debttracker.simulation;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Stateless port of the frontend {@code src/utils/simulate.ts} engine. The
 * month-by-month logic, ordering and rounding mirror the TypeScript version
 * exactly. No database access.
 */
@Service
public class SimulationService {

    /** Hard ceiling so an underfunded plan can never loop forever. */
    private static final int MAX_MONTHS = 1200;

    /** Snowball: throw extra money at the smallest balance first. */
    public SimulationResult.StrategyResult runSnowball(SimulationRequest input) {
        return simulate(input, Comparator.<DebtState>comparingDouble(s -> s.balance));
    }

    /** Avalanche: throw extra money at the highest interest rate first. */
    public SimulationResult.StrategyResult runAvalanche(SimulationRequest input) {
        return simulate(input, (a, b) -> Double.compare(b.monthlyRate, a.monthlyRate));
    }

    /**
     * Core month-by-month engine. {@code prioritize} orders the open debts so
     * the leftover budget flows to the strategy's preferred debt first. Pure:
     * the request is never mutated.
     */
    private SimulationResult.StrategyResult simulate(
            SimulationRequest input, Comparator<DebtState> prioritize) {

        // Active debts only: positive balance (the request carries no status).
        List<DebtState> states = new ArrayList<>();
        if (input.getDebts() != null) {
            for (SimulationRequest.DebtInput d : input.getDebts()) {
                if (d.getBalance() != null && d.getBalance() > 0) {
                    DebtState s = new DebtState();
                    s.id = d.getId();
                    s.name = d.getName();
                    s.balance = d.getBalance();
                    s.monthlyRate = d.getInterestRate() / 100.0 / 12.0;
                    s.minPayment = d.getMinimumPayment();
                    s.interestPaid = 0;
                    s.payoffMonth = 0;
                    states.add(s);
                }
            }
        }

        List<SimulationResult.MonthlySnapshot> snapshots = new ArrayList<>();
        List<SimulationResult.PayoffEntry> payoffOrder = new ArrayList<>();

        SimulationResult.StrategyResult result = new SimulationResult.StrategyResult();
        result.setPayoffOrder(payoffOrder);
        result.setMonthlySnapshots(snapshots);

        // Nothing to pay off — an empty, affordable result.
        if (states.isEmpty()) {
            result.setMonthsToPayoff(0);
            result.setTotalInterestPaid(0);
            result.setUnaffordable(false);
            return result;
        }

        double totalMinimums = 0;
        for (DebtState s : states) {
            totalMinimums += s.minPayment;
        }

        double monthlyBudget = input.getMonthlyBudget();
        // If the budget cannot even cover the minimums, the plan never converges.
        if (monthlyBudget < totalMinimums) {
            result.setMonthsToPayoff(-1);
            result.setTotalInterestPaid(-1);
            result.setUnaffordable(true);
            return result;
        }

        int month = 0;
        int cleared = 0;

        while (cleared < states.size() && month < MAX_MONTHS) {
            month++;

            // 1. Accrue interest on every outstanding debt.
            for (DebtState s : states) {
                if (s.balance <= 0) continue;
                double interest = s.balance * s.monthlyRate;
                s.balance += interest;
                s.interestPaid += interest;
            }

            // 2. Each month gets the full budget to spend.
            double available = monthlyBudget;

            // 3. Pay the minimum on every still-open debt first.
            for (DebtState s : states) {
                if (s.balance <= 0) continue;
                double pay = Math.min(Math.min(s.minPayment, s.balance), available);
                s.balance -= pay;
                available -= pay;
            }

            // 4. Funnel everything left into the highest-priority open debts.
            List<DebtState> prioritized = new ArrayList<>(states);
            prioritized.sort(prioritize);
            for (DebtState s : prioritized) {
                if (available <= 0) break;
                if (s.balance <= 0) continue;
                double pay = Math.min(s.balance, available);
                s.balance -= pay;
                available -= pay;
            }

            // 5. Record any debts cleared this month, in payoff order.
            for (DebtState s : states) {
                if (s.balance <= 0 && s.payoffMonth == 0) {
                    s.balance = 0;
                    s.payoffMonth = month;
                    cleared++;
                    SimulationResult.PayoffEntry entry = new SimulationResult.PayoffEntry();
                    entry.setDebtId(s.id);
                    entry.setName(s.name);
                    entry.setPaidOffInMonth(month);
                    entry.setInterestPaid(round(s.interestPaid));
                    payoffOrder.add(entry);
                }
            }

            // 6. Snapshot end-of-month total balance.
            double totalBalance = 0;
            for (DebtState s : states) {
                totalBalance += s.balance;
            }
            SimulationResult.MonthlySnapshot snapshot = new SimulationResult.MonthlySnapshot();
            snapshot.setMonth(month);
            snapshot.setTotalBalance(round(totalBalance));
            snapshots.add(snapshot);
        }

        boolean unaffordable = cleared < states.size();
        double totalInterestPaid = 0;
        for (DebtState s : states) {
            totalInterestPaid += s.interestPaid;
        }

        result.setMonthsToPayoff(unaffordable ? -1 : month);
        result.setTotalInterestPaid(unaffordable ? -1 : round(totalInterestPaid));
        result.setUnaffordable(unaffordable);
        return result;
    }

    /** Avoid floating-point drift in reported figures (2 decimal places). */
    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    /** Mutable per-debt state tracked while stepping through months. */
    private static final class DebtState {
        String id;
        String name;
        double balance;
        double monthlyRate;
        double minPayment;
        double interestPaid;
        int payoffMonth;
    }
}

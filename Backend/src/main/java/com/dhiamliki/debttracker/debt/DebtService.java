package com.dhiamliki.debttracker.debt;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class DebtService {

    private final DebtRepository debtRepository;

    public DebtService(DebtRepository debtRepository) {
        this.debtRepository = debtRepository;
    }

    @Transactional(readOnly = true)
    public List<Debt> getDebtsForUser(UUID userId) {
        return debtRepository.findByUserId(userId);
    }

    /** Replace all of the user's debts with the supplied set. */
    @Transactional
    public List<Debt> saveDebtsForUser(UUID userId, List<DebtInput> debts) {
        debtRepository.deleteByUserId(userId);

        List<Debt> entities = new ArrayList<>();
        for (DebtInput input : debts) {
            Debt debt = new Debt();
            debt.setUserId(userId);
            debt.setName(input.getName());
            debt.setBalance(input.getBalance());
            debt.setInterestRate(input.getInterestRate());
            debt.setMinimumPayment(input.getMinimumPayment());
            entities.add(debt);
        }
        return debtRepository.saveAll(entities);
    }
}

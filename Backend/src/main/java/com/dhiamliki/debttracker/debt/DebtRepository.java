package com.dhiamliki.debttracker.debt;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DebtRepository extends JpaRepository<Debt, UUID> {

    List<Debt> findByUserId(UUID userId);

    void deleteByUserId(UUID userId);
}

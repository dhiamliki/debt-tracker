package com.dhiamliki.debttracker.debt;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class DebtInput {

    @NotBlank
    private String name;

    @NotNull
    private BigDecimal balance;

    @NotNull
    private BigDecimal interestRate;

    @NotNull
    private BigDecimal minimumPayment;
}

package com.dhiamliki.debttracker.user;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class UpdateUserRequest {

    private BigDecimal monthlyIncome;

    private String displayName;
}

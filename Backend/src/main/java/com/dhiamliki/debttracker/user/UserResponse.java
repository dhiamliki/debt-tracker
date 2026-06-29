package com.dhiamliki.debttracker.user;

import java.math.BigDecimal;
import java.time.Instant;

public record UserResponse(
        String email,
        String displayName,
        BigDecimal monthlyIncome,
        boolean verified,
        boolean twoFaEnabled,
        Instant createdAt) {

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getEmail(),
                user.getDisplayName(),
                user.getMonthlyIncome(),
                user.isVerified(),
                user.isTwoFaEnabled(),
                user.getCreatedAt());
    }
}

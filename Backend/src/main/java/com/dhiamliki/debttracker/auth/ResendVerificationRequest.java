package com.dhiamliki.debttracker.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ResendVerificationRequest {

    @NotBlank
    private String email;
}

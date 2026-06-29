package com.dhiamliki.debttracker.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class Verify2FARequest {

    @NotBlank
    private String email;

    @NotBlank
    private String code;
}

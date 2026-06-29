package com.dhiamliki.debttracker.user;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class Update2FARequest {

    @NotNull
    private Boolean enabled;

    /** Optional one-time code emailed to the user to confirm the change. */
    private String otpCode;
}

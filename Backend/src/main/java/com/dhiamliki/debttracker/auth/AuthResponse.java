package com.dhiamliki.debttracker.auth;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String token;
    private String email;
    private boolean requires2FA;

    public AuthResponse(String token, String email) {
        this.token = token;
        this.email = email;
    }

    /** Login succeeded against the password, but a one-time code is still required. */
    public static AuthResponse requiresTwoFactor() {
        AuthResponse response = new AuthResponse();
        response.setRequires2FA(true);
        return response;
    }
}

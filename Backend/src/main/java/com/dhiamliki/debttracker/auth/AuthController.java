package com.dhiamliki.debttracker.auth;

import com.dhiamliki.debttracker.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ApiResponse<Void> register(@Valid @RequestBody AuthRequest request) {
        String message = authService.register(request);
        return ApiResponse.success(null, message);
    }

    @PostMapping("/verify-email")
    public ApiResponse<AuthResponse> verifyEmail(@RequestParam("token") String token) {
        return ApiResponse.success(authService.verifyEmail(token), "Email verified");
    }

    @PostMapping("/resend-verification")
    public ApiResponse<Void> resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        String message = authService.resendVerification(request.getEmail());
        return ApiResponse.success(null, message);
    }

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody AuthRequest request) {
        AuthResponse response = authService.login(request);
        String message = response.isRequires2FA()
                ? "Enter the code sent to your email"
                : "Login successful";
        return ApiResponse.success(response, message);
    }

    @PostMapping("/verify-2fa")
    public ApiResponse<AuthResponse> verify2FA(@Valid @RequestBody Verify2FARequest request) {
        return ApiResponse.success(
                authService.verify2FA(request.getEmail(), request.getCode()), "Login successful");
    }

    /** Send a one-time code to the authenticated user (e.g. to confirm a 2FA change). */
    @PostMapping("/send-otp")
    public ApiResponse<Void> sendOtp() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        authService.sendOtp(email);
        return ApiResponse.success(null, "OTP sent to your email");
    }
}

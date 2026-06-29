package com.dhiamliki.debttracker.user;

import com.dhiamliki.debttracker.auth.AuthService;
import com.dhiamliki.debttracker.common.ApiResponse;
import com.dhiamliki.debttracker.exception.ResourceNotFoundException;
import jakarta.validation.Valid;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final AuthService authService;

    public UserController(UserRepository userRepository, AuthService authService) {
        this.userRepository = userRepository;
        this.authService = authService;
    }

    @GetMapping("/me")
    public ApiResponse<UserResponse> me() {
        return ApiResponse.success(UserResponse.from(currentUser()), "User retrieved");
    }

    @PatchMapping("/me")
    public ApiResponse<UserResponse> updateMe(@RequestBody UpdateUserRequest request) {
        User user = currentUser();
        if (request.getDisplayName() != null) {
            user.setDisplayName(request.getDisplayName());
        }
        if (request.getMonthlyIncome() != null) {
            user.setMonthlyIncome(request.getMonthlyIncome());
        }
        userRepository.save(user);
        return ApiResponse.success(UserResponse.from(user), "Profile updated");
    }

    @PatchMapping("/me/2fa")
    public ApiResponse<UserResponse> update2FA(@Valid @RequestBody Update2FARequest request) {
        User user = currentUser();
        // When an OTP is supplied, the change must be confirmed against the emailed code.
        if (request.getOtpCode() != null && !request.getOtpCode().isBlank()) {
            authService.consumeOtp(user, request.getOtpCode());
        }
        user.setTwoFaEnabled(request.getEnabled());
        userRepository.save(user);
        String message = request.getEnabled()
                ? "Two-factor authentication enabled"
                : "Two-factor authentication disabled";
        return ApiResponse.success(UserResponse.from(user), message);
    }

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
    }
}

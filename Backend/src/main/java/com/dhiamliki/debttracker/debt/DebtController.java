package com.dhiamliki.debttracker.debt;

import com.dhiamliki.debttracker.common.ApiResponse;
import com.dhiamliki.debttracker.exception.ResourceNotFoundException;
import com.dhiamliki.debttracker.user.User;
import com.dhiamliki.debttracker.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/debts")
public class DebtController {

    private final DebtService debtService;
    private final UserRepository userRepository;

    public DebtController(DebtService debtService, UserRepository userRepository) {
        this.debtService = debtService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ApiResponse<List<Debt>> getDebts() {
        List<Debt> debts = debtService.getDebtsForUser(currentUserId());
        return ApiResponse.success(debts, "Debts retrieved");
    }

    @PostMapping
    public ApiResponse<List<Debt>> saveDebts(@Valid @RequestBody List<DebtInput> debts) {
        List<Debt> saved = debtService.saveDebtsForUser(currentUserId(), debts);
        return ApiResponse.success(saved, "Debts saved");
    }

    /**
     * Resolve the authenticated user's id. JwtAuthFilter stores the user's
     * email as the authentication principal, so we look the user up by email.
     */
    private UUID currentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
        return user.getId();
    }
}

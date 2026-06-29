package com.dhiamliki.debttracker.plan;

import com.dhiamliki.debttracker.common.ApiResponse;
import com.dhiamliki.debttracker.exception.ResourceNotFoundException;
import com.dhiamliki.debttracker.user.User;
import com.dhiamliki.debttracker.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/plans")
public class SavedPlanController {

    private final SavedPlanService savedPlanService;
    private final UserRepository userRepository;

    public SavedPlanController(
            SavedPlanService savedPlanService, UserRepository userRepository) {
        this.savedPlanService = savedPlanService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ApiResponse<List<SavedPlanResponse>> listPlans() {
        return ApiResponse.success(
                savedPlanService.getPlansForUser(currentUserId()), "Plans retrieved");
    }

    @PostMapping
    public ApiResponse<SavedPlanResponse> savePlan(@Valid @RequestBody SavePlanRequest request) {
        return ApiResponse.success(
                savedPlanService.createPlan(currentUserId(), request), "Plan saved");
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deletePlan(@PathVariable UUID id) {
        savedPlanService.deletePlan(currentUserId(), id);
        return ApiResponse.success(null, "Plan deleted");
    }

    /** Resolve the authenticated user's id from the email principal. */
    private UUID currentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
        return user.getId();
    }
}

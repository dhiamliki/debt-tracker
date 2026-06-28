package com.dhiamliki.debttracker.simulation;

import com.dhiamliki.debttracker.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/simulation")
public class SimulationController {

    private final SimulationService simulationService;

    public SimulationController(SimulationService simulationService) {
        this.simulationService = simulationService;
    }

    @PostMapping("/run")
    public ApiResponse<SimulationResult> run(@Valid @RequestBody SimulationRequest request) {
        SimulationResult result = new SimulationResult();
        result.setSnowball(simulationService.runSnowball(request));
        result.setAvalanche(simulationService.runAvalanche(request));
        return ApiResponse.success(result, "Simulation completed");
    }
}

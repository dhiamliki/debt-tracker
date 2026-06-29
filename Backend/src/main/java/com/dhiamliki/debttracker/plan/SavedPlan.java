package com.dhiamliki.debttracker.plan;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "saved_plans")
public class SavedPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String name;

    @Column(name = "monthly_budget", nullable = false)
    private BigDecimal monthlyBudget;

    // JSON columns stored as text; Hibernate maps them to/from jsonb.
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "debts_snapshot", nullable = false)
    private String debtsSnapshot;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "snowball_result")
    private String snowballResult;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "avalanche_result")
    private String avalancheResult;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public BigDecimal getMonthlyBudget() {
        return monthlyBudget;
    }

    public void setMonthlyBudget(BigDecimal monthlyBudget) {
        this.monthlyBudget = monthlyBudget;
    }

    public String getDebtsSnapshot() {
        return debtsSnapshot;
    }

    public void setDebtsSnapshot(String debtsSnapshot) {
        this.debtsSnapshot = debtsSnapshot;
    }

    public String getSnowballResult() {
        return snowballResult;
    }

    public void setSnowballResult(String snowballResult) {
        this.snowballResult = snowballResult;
    }

    public String getAvalancheResult() {
        return avalancheResult;
    }

    public void setAvalancheResult(String avalancheResult) {
        this.avalancheResult = avalancheResult;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}

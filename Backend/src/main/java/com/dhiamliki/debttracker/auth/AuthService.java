package com.dhiamliki.debttracker.auth;

import com.dhiamliki.debttracker.exception.BusinessException;
import com.dhiamliki.debttracker.security.JwtUtil;
import com.dhiamliki.debttracker.user.User;
import com.dhiamliki.debttracker.user.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
public class AuthService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil,
            EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.emailService = emailService;
    }

    /**
     * Create the account in an unverified state, issue a verification token and
     * email it. No JWT is returned — the user must verify before logging in.
     */
    public String register(AuthRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new BusinessException("Email is already registered");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setVerified(false);

        String token = UUID.randomUUID().toString();
        user.setVerificationToken(token);
        user.setVerificationTokenExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));
        userRepository.save(user);

        emailService.sendVerificationEmail(user.getEmail(), token);
        return "Check your email to verify your account";
    }

    /** Mark the account verified, clear the token and log the user in. */
    public AuthResponse verifyEmail(String token) {
        User user = userRepository.findByVerificationToken(token)
                .orElseThrow(() -> new BusinessException("Invalid verification token"));

        if (user.getVerificationTokenExpiresAt() == null
                || user.getVerificationTokenExpiresAt().isBefore(Instant.now())) {
            throw new BusinessException("Verification token has expired");
        }

        user.setVerified(true);
        user.setVerificationToken(null);
        user.setVerificationTokenExpiresAt(null);
        userRepository.save(user);

        String jwt = jwtUtil.generateToken(user.getEmail());
        return new AuthResponse(jwt, user.getEmail());
    }

    public AuthResponse login(AuthRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BusinessException("Invalid email or password");
        }

        // TODO: re-enable email verification check when domain is verified
        // if (!user.isVerified()) {
        //     throw new BusinessException("Please verify your email before logging in");
        // }

        // TODO: re-enable 2FA when domain is verified
        // if (user.isTwoFaEnabled()) {
        //     String otp = generateOtp();
        //     user.setOtpCode(otp);
        //     user.setOtpExpiresAt(Instant.now().plus(10, ChronoUnit.MINUTES));
        //     userRepository.save(user);
        //
        //     emailService.sendOtpEmail(user.getEmail(), otp);
        //     return AuthResponse.requiresTwoFactor();
        // }

        String jwt = jwtUtil.generateToken(user.getEmail());
        return new AuthResponse(jwt, user.getEmail());
    }

    /** Validate the one-time code and complete the login. */
    public AuthResponse verify2FA(String email, String code) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Invalid code"));

        if (user.getOtpCode() == null || !user.getOtpCode().equals(code)) {
            throw new BusinessException("Invalid code");
        }

        if (user.getOtpExpiresAt() == null || user.getOtpExpiresAt().isBefore(Instant.now())) {
            throw new BusinessException("Code has expired");
        }

        user.setOtpCode(null);
        user.setOtpExpiresAt(null);
        userRepository.save(user);

        String jwt = jwtUtil.generateToken(user.getEmail());
        return new AuthResponse(jwt, user.getEmail());
    }

    /** Issue a fresh verification token and resend the email. */
    public String resendVerification(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("No account found for that email"));

        if (user.isVerified()) {
            throw new BusinessException("Account is already verified");
        }

        String token = UUID.randomUUID().toString();
        user.setVerificationToken(token);
        user.setVerificationTokenExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));
        userRepository.save(user);

        emailService.sendVerificationEmail(user.getEmail(), token);
        return "Verification email sent";
    }

    /** Generate a fresh 6-digit OTP, store it with a 10-minute expiry and email it. */
    public void sendOtp(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("No account found for that email"));

        String otp = generateOtp();
        user.setOtpCode(otp);
        user.setOtpExpiresAt(Instant.now().plus(10, ChronoUnit.MINUTES));
        userRepository.save(user);

        emailService.sendOtpEmail(user.getEmail(), otp);
    }

    /**
     * Validate a one-time code against the user's stored OTP and clear it.
     * Mutates the user in place; the caller is responsible for persisting.
     * Throws {@link BusinessException} if the code is wrong or expired.
     */
    public void consumeOtp(User user, String code) {
        if (user.getOtpCode() == null
                || !user.getOtpCode().equals(code)
                || user.getOtpExpiresAt() == null
                || user.getOtpExpiresAt().isBefore(Instant.now())) {
            throw new BusinessException("Invalid or expired verification code");
        }

        user.setOtpCode(null);
        user.setOtpExpiresAt(null);
    }

    private String generateOtp() {
        return String.format("%06d", RANDOM.nextInt(1_000_000));
    }
}

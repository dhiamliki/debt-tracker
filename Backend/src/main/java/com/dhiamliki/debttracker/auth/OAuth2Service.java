package com.dhiamliki.debttracker.auth;

import com.dhiamliki.debttracker.security.JwtUtil;
import com.dhiamliki.debttracker.user.User;
import com.dhiamliki.debttracker.user.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class OAuth2Service {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public OAuth2Service(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    /**
     * Log a user in via an external provider (Google / GitHub). Returning users
     * are matched by email; first-time users get a verified account with a
     * random unusable password. Always returns a signed JWT.
     */
    public String processOAuth2Login(String email, String name, String provider) {
        User user = userRepository.findByEmail(email)
                .orElseGet(() -> createOAuth2User(email, name));
        return jwtUtil.generateToken(user.getEmail());
    }

    private User createOAuth2User(String email, String name) {
        User user = new User();
        user.setEmail(email);
        // They authenticate through the provider — this password is never used.
        user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        // The provider already verified the email; skip our own verification.
        user.setVerified(true);
        user.setTwoFaEnabled(false);
        if (name != null && !name.isBlank()) {
            user.setDisplayName(name);
        }
        return userRepository.save(user);
    }
}

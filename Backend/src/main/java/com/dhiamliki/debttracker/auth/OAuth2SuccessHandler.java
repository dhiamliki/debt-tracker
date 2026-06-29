package com.dhiamliki.debttracker.auth;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Map;

/**
 * After Spring completes the OAuth2 handshake, mint our own JWT for the user
 * and hand it back to the SPA via the callback URL.
 */
@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private static final String CALLBACK_URL = "http://localhost:5173/oauth2/callback";

    private final OAuth2Service oAuth2Service;

    public OAuth2SuccessHandler(OAuth2Service oAuth2Service) {
        this.oAuth2Service = oAuth2Service;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) throws IOException, ServletException {

        OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) authentication;
        String provider = token.getAuthorizedClientRegistrationId(); // "google" | "github"
        OAuth2User principal = token.getPrincipal();
        Map<String, Object> attributes = principal.getAttributes();

        String email = (String) attributes.get("email");
        String name = (String) attributes.get("name");

        // GitHub only exposes a public email; fall back to its noreply address
        // (and the login handle as a name) when the primary email is hidden.
        if (email == null && "github".equals(provider)) {
            Object login = attributes.get("login");
            if (login != null) {
                email = login + "@users.noreply.github.com";
                if (name == null) {
                    name = login.toString();
                }
            }
        }

        if (email == null) {
            response.sendRedirect(
                    CALLBACK_URL + "?error=" + "Could+not+retrieve+email+from+" + provider);
            return;
        }

        String jwt = oAuth2Service.processOAuth2Login(email, name, provider);

        String redirectUrl = UriComponentsBuilder.fromUriString(CALLBACK_URL)
                .queryParam("token", jwt)
                .build()
                .toUriString();
        response.sendRedirect(redirectUrl);
    }
}

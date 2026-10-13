
package com.civic.reporter.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@CrossOrigin(origins = {
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "https://ai-civic-reporter-theta.vercel.app"
})
@RestController
@RequestMapping("/api/photos")
public class PhotoUploadController {

    private final Path uploadDir =
        Paths.get("uploads").toAbsolutePath().normalize();

    @PostMapping("/upload")
    public String uploadPhoto(
            @RequestParam("photo") MultipartFile photo) {

        try {
            if (photo == null || photo.isEmpty()) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Please select a photo"
                );
            }

            String contentType = photo.getContentType();

            if (contentType == null
                    || !contentType.startsWith("image/")) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Only image files are allowed"
                );
            }

            Files.createDirectories(uploadDir);

            String originalName =
                photo.getOriginalFilename() == null
                    ? "image"
                    : Paths.get(photo.getOriginalFilename())
                        .getFileName().toString();

            String extension = "";
            int dot = originalName.lastIndexOf('.');

            if (dot >= 0) {
                extension = originalName.substring(dot)
                    .replaceAll("[^a-zA-Z0-9.]", "");
            }

            String fileName = UUID.randomUUID() + extension;
            Path target = uploadDir.resolve(fileName).normalize();

            if (!target.startsWith(uploadDir)) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid file name"
                );
            }

            Files.copy(
                photo.getInputStream(),
                target,
                StandardCopyOption.REPLACE_EXISTING
            );

            return fileName;

        } catch (IOException e) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Could not upload photo"
            );
        }
    }

    @GetMapping("/{fileName:.+}")
    public ResponseEntity<Resource> getPhoto(
            @PathVariable String fileName) {

        try {
            Path filePath = uploadDir.resolve(fileName).normalize();

            if (!filePath.startsWith(uploadDir)
                    || !Files.isRegularFile(filePath)) {
                throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Photo not found"
                );
            }

            Resource resource = new UrlResource(filePath.toUri());

            String contentType = Files.probeContentType(filePath);

            MediaType mediaType = contentType != null
                ? MediaType.parseMediaType(contentType)
                : MediaType.APPLICATION_OCTET_STREAM;

            return ResponseEntity.ok()
                .contentType(mediaType)
                .body(resource);

        } catch (IOException e) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Photo not found"
            );
        }
    }
}

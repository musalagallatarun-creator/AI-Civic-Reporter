
package com.civic.reporter.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class FileController {

    private final Path uploadDir =
            Paths.get("uploads").toAbsolutePath().normalize();

    @GetMapping("/uploads/{fileName:.+}")
    public ResponseEntity<Resource> getFile(
            @PathVariable String fileName) {

        try {
            Path filePath =
                    uploadDir.resolve(fileName).normalize();

            // Prevent access outside the uploads directory
            if (!filePath.startsWith(uploadDir)
                    || filePath.equals(uploadDir)) {
                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .build();
            }

            Resource resource =
                    new UrlResource(filePath.toUri());

            if (!resource.exists() || !resource.isReadable()
                    || !Files.isRegularFile(filePath)) {
                return ResponseEntity
                        .status(HttpStatus.NOT_FOUND)
                        .build();
            }

            String contentType =
                    Files.probeContentType(filePath);

            if (contentType == null) {
                contentType = "application/octet-stream";
            }

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, contentType)
                    .body(resource);

        } catch (IOException e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .build();
        }
    }
}

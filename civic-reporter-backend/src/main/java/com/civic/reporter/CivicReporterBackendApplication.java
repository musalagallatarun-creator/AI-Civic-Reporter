package com.civic.reporter;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CivicReporterBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(CivicReporterBackendApplication.class, args);
    }
}
package com.civic.reporter.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.civic.reporter.entity.Complaint;

public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    List<Complaint> findByDeadlineBeforeAndStatusNotAndEscalatedFalse(
            LocalDateTime time,
            String status
    );
}
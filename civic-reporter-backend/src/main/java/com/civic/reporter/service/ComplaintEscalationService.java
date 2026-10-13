package com.civic.reporter.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.civic.reporter.entity.Complaint;
import com.civic.reporter.repository.ComplaintRepository;

@Service
public class ComplaintEscalationService {

    private final ComplaintRepository complaintRepository;

    public ComplaintEscalationService(ComplaintRepository complaintRepository) {
        this.complaintRepository = complaintRepository;
    }

    @Scheduled(fixedRate = 60000)
    public void checkDeadlines() {

        LocalDateTime now = LocalDateTime.now();

        List<Complaint> overdueComplaints =
                complaintRepository.findByDeadlineBeforeAndStatusNotAndEscalatedFalse(
                        now,
                        "RESOLVED"
                );

        for (Complaint complaint : overdueComplaints) {
            complaint.setEscalated(true);
            complaintRepository.save(complaint);
        }
    }
}

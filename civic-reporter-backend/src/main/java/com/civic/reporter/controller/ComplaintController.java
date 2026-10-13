
package com.civic.reporter.controller;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.civic.reporter.entity.Complaint;
import com.civic.reporter.repository.ComplaintRepository;

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
@RequestMapping("/api/complaints")
public class ComplaintController {

    private final ComplaintRepository complaintRepository;

    public ComplaintController(
            ComplaintRepository complaintRepository) {
        this.complaintRepository = complaintRepository;
    }

    @GetMapping
    public List<Complaint> getAllComplaints() {
        return complaintRepository.findAll();
    }

    @GetMapping("/{id}")
    public Complaint getComplaintById(@PathVariable Long id) {
        return complaintRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Complaint not found"
            ));
    }

    @PostMapping
    public Complaint createComplaint(
            @RequestBody Complaint complaint) {

        if (complaint.getStatus() == null
                || complaint.getStatus().isBlank()) {
            complaint.setStatus("PENDING");
        }

        return complaintRepository.save(complaint);
    }

    @PutMapping("/{id}/deadline")
    public Complaint setDeadline(
            @PathVariable Long id,
            @RequestParam String deadline) {

        Complaint complaint = complaintRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Complaint not found"
            ));

        try {
            complaint.setDeadline(
                LocalDateTime.parse(deadline)
            );
        } catch (Exception e) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Deadline must use format yyyy-MM-ddTHH:mm:ss"
            );
        }

        return complaintRepository.save(complaint);
    }

    @PutMapping("/{id}/status")
    public Complaint updateStatus(
            @PathVariable Long id,
            @RequestParam String status) {

        Complaint complaint = complaintRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Complaint not found"
            ));

        complaint.setStatus(status.toUpperCase());

        return complaintRepository.save(complaint);
    }
}

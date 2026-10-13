package com.civic.reporter.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.civic.reporter.entity.User;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByMobile(String mobile);
}
package dev.hucoo.runtime;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class ModelRuntimeApplication {
    public static void main(String[] args) {
        SpringApplication.run(ModelRuntimeApplication.class, args);
    }
}

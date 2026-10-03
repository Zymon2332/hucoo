package dev.hucoo.commons.dto;

@FunctionalInterface
public interface AsyncJobTask {

    void run(AsyncJobContext context) throws Exception;
}

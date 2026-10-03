package dev.hucoo.commons.dto;

public interface AsyncJobListener {

    void created(AsyncJobDTO job);

    void updated(AsyncJobDTO job);
}

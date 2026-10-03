package dev.hucoo.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;

import dev.hucoo.admin.infrastructure.mapper.AsyncJobRecordMapper;
import dev.hucoo.admin.job.AsyncJobPersistenceListener;
import dev.hucoo.admin.job.AsyncJobRecord;
import dev.hucoo.commons.dto.AsyncJobDTO;
import dev.hucoo.commons.dto.AsyncJobStatus;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.mockito.ArgumentCaptor;

class AsyncJobPersistenceListenerTest {

    @Test
    void mapsTenantAndTerminalStateToPersistenceRecord() {
        AsyncJobRecordMapper mapper = Mockito.mock(AsyncJobRecordMapper.class);
        AsyncJobPersistenceListener listener = new AsyncJobPersistenceListener(mapper);
        AsyncJobDTO job = AsyncJobDTO.builder()
                .jobId("job-1")
                .requestId("request-1")
                .jobType("MODEL_VALIDATION")
                .tenantId("tenant-a")
                .status(AsyncJobStatus.SUCCEEDED)
                .progress(100)
                .message("任务完成")
                .retryCount(1)
                .cancelRequested(false)
                .build();

        listener.created(job);

        ArgumentCaptor<AsyncJobRecord> captor = ArgumentCaptor.forClass(AsyncJobRecord.class);
        verify(mapper).insert(captor.capture());
        AsyncJobRecord record = captor.getValue();
        assertEquals("tenant-a", record.getTenantId());
        assertEquals("MODEL_VALIDATION", record.getJobType());
        assertEquals("SUCCEEDED", record.getStatus());
        assertEquals(1, record.getRetryCount());
        assertEquals(0, record.getCancelRequested());
    }
}

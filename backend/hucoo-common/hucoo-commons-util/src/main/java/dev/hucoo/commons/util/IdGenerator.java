package dev.hucoo.commons.util;

import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

public final class IdGenerator {

    private static final long EPOCH = 1704067200000L;
    private static final long WORKER_ID_BITS = 5L;
    private static final long DATACENTER_ID_BITS = 5L;
    private static final long SEQUENCE_BITS = 12L;
    private static final long MAX_WORKER_ID = ~(-1L << WORKER_ID_BITS);
    private static final long MAX_DATACENTER_ID = ~(-1L << DATACENTER_ID_BITS);
    private static final long SEQUENCE_MASK = ~(-1L << SEQUENCE_BITS);
    private static final long WORKER_ID_SHIFT = SEQUENCE_BITS;
    private static final long DATACENTER_ID_SHIFT = SEQUENCE_BITS + WORKER_ID_BITS;
    private static final long TIMESTAMP_SHIFT = SEQUENCE_BITS + WORKER_ID_BITS + DATACENTER_ID_BITS;

    private static final Snowflake SNOWFLAKE = new Snowflake(resolveWorkerId(), resolveDatacenterId());

    private IdGenerator() {
    }

    public static long nextId() {
        return SNOWFLAKE.nextId();
    }

    public static String nextIdStr() {
        return Long.toString(SNOWFLAKE.nextId());
    }

    public static String uuid() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    public static String traceId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }

    public static String randomNumeric(int length) {
        StringBuilder builder = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            builder.append(ThreadLocalRandom.current().nextInt(10));
        }
        return builder.toString();
    }

    private static long resolveWorkerId() {
        return Math.floorMod(ProcessHandle.current().pid(), MAX_WORKER_ID + 1);
    }

    private static long resolveDatacenterId() {
        return ThreadLocalRandom.current().nextLong(MAX_DATACENTER_ID + 1);
    }

    private static final class Snowflake {

        private final long workerId;
        private final long datacenterId;
        private long sequence = 0L;
        private long lastTimestamp = -1L;

        private Snowflake(long workerId, long datacenterId) {
            if (workerId < 0 || workerId > MAX_WORKER_ID) {
                throw new IllegalArgumentException("workerId must be between 0 and " + MAX_WORKER_ID);
            }
            if (datacenterId < 0 || datacenterId > MAX_DATACENTER_ID) {
                throw new IllegalArgumentException("datacenterId must be between 0 and " + MAX_DATACENTER_ID);
            }
            this.workerId = workerId;
            this.datacenterId = datacenterId;
        }

        private synchronized long nextId() {
            long timestamp = System.currentTimeMillis();
            if (timestamp < lastTimestamp) {
                timestamp = waitUntil(lastTimestamp);
            }
            if (timestamp == lastTimestamp) {
                sequence = (sequence + 1) & SEQUENCE_MASK;
                if (sequence == 0) {
                    timestamp = waitUntil(lastTimestamp);
                }
            } else {
                sequence = ThreadLocalRandom.current().nextLong(SEQUENCE_MASK + 1);
            }
            lastTimestamp = timestamp;
            return ((timestamp - EPOCH) << TIMESTAMP_SHIFT)
                    | (datacenterId << DATACENTER_ID_SHIFT)
                    | (workerId << WORKER_ID_SHIFT)
                    | sequence;
        }

        private long waitUntil(long lastTimestamp) {
            long timestamp = System.currentTimeMillis();
            while (timestamp <= lastTimestamp) {
                timestamp = System.currentTimeMillis();
            }
            return timestamp;
        }
    }
}

package dev.hucoo.commons.util;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

public final class DateTimeUtil {

    public static final String PATTERN_DATE = "yyyy-MM-dd";
    public static final String PATTERN_DATETIME = "yyyy-MM-dd HH:mm:ss";
    public static final String PATTERN_DATETIME_MILLIS = "yyyy-MM-dd HH:mm:ss.SSS";

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern(PATTERN_DATE);
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern(PATTERN_DATETIME);
    private static final DateTimeFormatter MILLIS_FORMATTER = DateTimeFormatter.ofPattern(PATTERN_DATETIME_MILLIS);

    private DateTimeUtil() {
    }

    public static LocalDateTime now() {
        return LocalDateTime.now();
    }

    public static String format(LocalDateTime dateTime) {
        return dateTime == null ? null : DATETIME_FORMATTER.format(dateTime);
    }

    public static String format(LocalDateTime dateTime, String pattern) {
        return dateTime == null ? null : DateTimeFormatter.ofPattern(pattern).format(dateTime);
    }

    public static String formatMillis(LocalDateTime dateTime) {
        return dateTime == null ? null : MILLIS_FORMATTER.format(dateTime);
    }

    public static LocalDateTime parse(String text) {
        return StringUtil.isBlank(text) ? null : LocalDateTime.parse(text, DATETIME_FORMATTER);
    }

    public static LocalDate parseDate(String text) {
        return StringUtil.isBlank(text) ? null : LocalDate.parse(text, DATE_FORMATTER);
    }

    public static LocalDateTime startOfDay(LocalDate date) {
        return date == null ? null : date.atStartOfDay();
    }

    public static LocalDateTime endOfDay(LocalDate date) {
        return date == null ? null : date.atTime(23, 59, 59);
    }

    public static long toEpochMilli(LocalDateTime dateTime) {
        return dateTime == null ? 0L : dateTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
    }

    public static LocalDateTime fromEpochMilli(long epochMilli) {
        return LocalDateTime.ofInstant(Instant.ofEpochMilli(epochMilli), ZoneId.systemDefault());
    }
}

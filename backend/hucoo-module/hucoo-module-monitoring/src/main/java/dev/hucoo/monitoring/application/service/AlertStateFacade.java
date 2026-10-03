package dev.hucoo.monitoring.application.service;
import java.util.Map;
public interface AlertStateFacade { Map<String,Object> transition(Long id, String action); }

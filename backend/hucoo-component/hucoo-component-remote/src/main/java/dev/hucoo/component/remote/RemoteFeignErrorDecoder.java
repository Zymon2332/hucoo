package dev.hucoo.component.remote;

import feign.Response;
import feign.codec.ErrorDecoder;

/** Converts Feign transport errors into the platform remote-call exception. */
public class RemoteFeignErrorDecoder implements ErrorDecoder {

    private final ErrorDecoder delegate = new ErrorDecoder.Default();

    @Override
    public Exception decode(String methodKey, Response response) {
        Exception cause = delegate.decode(methodKey, response);
        return new RemoteCallException(methodKey, response.status(), cause);
    }
}

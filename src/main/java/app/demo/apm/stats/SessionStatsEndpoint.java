/*
 * Copyright (c) 2008-2021 The Aspectran Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package app.demo.apm.stats;

import com.aspectran.core.activity.InstantActivitySupport;
import com.aspectran.core.component.bean.annotation.AvoidAdvice;
import com.aspectran.core.component.bean.annotation.Component;
import com.aspectran.core.util.logging.Logger;
import com.aspectran.core.util.logging.LoggerFactory;
import com.aspectran.jetty.JettyServer;
import com.aspectran.websocket.jsr356.AspectranConfigurator;
import jakarta.websocket.CloseReason;
import jakarta.websocket.OnClose;
import jakarta.websocket.OnError;
import jakarta.websocket.OnMessage;
import jakarta.websocket.OnOpen;
import jakarta.websocket.Session;
import jakarta.websocket.server.ServerEndpoint;
import org.eclipse.jetty.server.session.DefaultSessionCache;
import org.eclipse.jetty.server.session.SessionHandler;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.Timer;
import java.util.TimerTask;

@Component
@ServerEndpoint(
        value = "/apm/stats",
        configurator = AspectranConfigurator.class
)
@AvoidAdvice
public class SessionStatsEndpoint extends InstantActivitySupport {

    private static final Logger logger = LoggerFactory.getLogger(SessionStatsEndpoint.class);

    private static final String COMMAND_JOIN = "JOIN:";

    private static final String COMMAND_LEAVE = "LEAVE";

    private static final String HEARTBEAT_PING_MSG = "--heartbeat-ping--";

    private static final String HEARTBEAT_PONG_MSG = "--heartbeat-pong--";

    private static final Set<Session> sessions = Collections.synchronizedSet(new HashSet<>());

    private int refreshIntervalInSeconds = 5;

    private volatile Timer timer;

    private volatile boolean first;

    @OnOpen
    public void onOpen(Session session) {
        if (logger.isDebugEnabled()) {
            logger.debug("WebSocket connection established with session: " + session.getId());
        }
    }

    @OnMessage
    public void onMessage(Session session, String message) {
        if (HEARTBEAT_PING_MSG.equals(message)) {
            session.getAsyncRemote().sendText(HEARTBEAT_PONG_MSG);
            return;
        }
        if (message != null && message.startsWith(COMMAND_JOIN)) {
            try {
                refreshIntervalInSeconds = Integer.parseInt(message.substring(COMMAND_JOIN.length()));
            } catch (NumberFormatException e) {
                // ignore
            }
            addSession(session);
        } else if (COMMAND_LEAVE.equals(message)) {
            removeSession(session);
        }
    }

    @OnClose
    public void onClose(Session session, CloseReason reason) {
        if (logger.isDebugEnabled()) {
            logger.debug("Websocket session " + session.getId() + " has been closed. Reason: " + reason);
        }
        removeSession(session);
    }

    @OnError
    public void onError(Session session, Throwable error) {
        logger.error("Error in websocket session: " + session.getId(), error);
        try {
            removeSession(session);
            session.close(new CloseReason(CloseReason.CloseCodes.UNEXPECTED_CONDITION, null));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private void broadcast(String message) {
        synchronized (sessions) {
            for (Session session : sessions) {
                if (session.isOpen()) {
                    session.getAsyncRemote().sendText(message);
                }
            }
        }
    }

    private void addSession(Session session) {
        if (sessions.add(session)) {
            first = true;
            if (timer == null) {
                timer = new Timer();
                timer.schedule(new TimerTask() {

                    private SessionStatistics oldStats;

                    @Override
                    public void run() {
                        SessionStatistics newStats = getSessionStats();
                        if (first || !newStats.equals(oldStats)) {
                            try {
                                broadcast(newStats.toJson());
                            } catch (IOException e) {
                                logger.warn(e);
                            }
                            oldStats = newStats;
                            if (first) {
                                first = false;
                            }
                        }
                    }

                }, 0, refreshIntervalInSeconds * 1000L);
            }
        }
    }

    private void removeSession(Session session) {
        if (sessions.remove(session) && sessions.isEmpty() && timer != null) {
            timer.cancel();
            timer = null;
        }
    }

    public SessionStatistics getSessionStats() {
        JettyServer jettyServer = getBeanRegistry().getBean("jetty.server");
        SessionHandler sessionHandler = jettyServer.getChildHandlerByClass(SessionHandler.class);
        DefaultSessionCache sessionCache = (DefaultSessionCache)sessionHandler.getSessionCache();

        SessionStatistics stats = new SessionStatistics();
        stats.setActiveSessionCount(sessionCache.getSessionsCurrent());
        stats.setHighestSessionCount(sessionCache.getSessionsMax());
        stats.setCreatedSessionCount(sessionCache.getSessionsTotal());
        return stats;
    }

}

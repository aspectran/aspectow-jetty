/*
 * Copyright (c) 2020-present The Aspectran Project
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
package aspectow.jetty.chat.model.payload;

import com.aspectran.utils.apon.AbstractParameters;
import com.aspectran.utils.apon.ParameterKey;
import com.aspectran.utils.apon.ValueType;

import java.util.Set;

/**
 * Represents the payload of a WebSocket frame to broadcast the available users.
 *
 * <p>Created: 2019/10/09</p>
 */
public class BroadcastAvailableUsersPayload extends AbstractParameters {

    private static final ParameterKey usernames;

    private static final ParameterKey[] parameterKeys;

    static {
        usernames = new ParameterKey("usernames", ValueType.STRING, true);

        parameterKeys = new ParameterKey[] {
                usernames
        };
    }

    public BroadcastAvailableUsersPayload() {
        super(parameterKeys);
    }

    public void setUsernames(Set<String> usernames) {
        for (String username : usernames) {
            putValue(BroadcastAvailableUsersPayload.usernames, username);
        }
    }

}

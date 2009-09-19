package org.jboss.workspace.client.layout;

import com.google.gwt.user.client.ui.Widget;
import org.jboss.workspace.client.framework.MessageCallback;
import org.jboss.workspace.client.rpc.CommandMessage;
import org.jboss.workspace.client.rpc.MessageBusClient;
import static org.jboss.workspace.client.rpc.MessageBusClient.subscribe;
import org.jboss.workspace.client.rpc.protocols.LayoutParts;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

public class LayoutHint {
    private static LinkedHashMap<Widget, LayoutHintProvider> MANAGED_WIDGETS = new LinkedHashMap<Widget, LayoutHintProvider>();
    private static LinkedHashMap<String, LayoutHintProvider> MANAGED_SUBJECTS = new LinkedHashMap<String, LayoutHintProvider>();

    public static void attach(final Widget w, LayoutHintProvider p) {
        String subject = "org.jboss.errai.sizeHints:" + w.getElement().getId() + ":" + System.currentTimeMillis();

        subscribe(subject,
                new MessageCallback() {
                    public void callback(CommandMessage message) {
                        w.setPixelSize(message.get(Double.class, LayoutParts.Width).intValue(),
                                message.get(Double.class, LayoutParts.Height).intValue());
                    }
                }, null);


        MANAGED_WIDGETS.put(w, p);
        MANAGED_SUBJECTS.put(subject, p);
    }

    public static LayoutHintProvider findProvider(Widget instance) {
        return MANAGED_WIDGETS.get(instance);
    }

    public static LayoutHintProvider findProvider(String subject) {
        return MANAGED_SUBJECTS.get(subject);
    }

    public static void hintAll() {
        LayoutHintProvider p;
        for (String s : MANAGED_SUBJECTS.keySet()) {
            if ((p = findProvider(s)) != null && p.getWidthHint() > 0 && p.getHeightHint() > 0) {
                MessageBusClient.store(s, CommandMessage.create()
                        .set(LayoutParts.Width, p.getWidthHint())
                        .set(LayoutParts.Height, p.getHeightHint()));
            }
        }

        for (Widget w : MANAGED_WIDGETS.keySet()) {
            p = findProvider(w);
            if (p != null && w.isAttached() && p.getWidthHint() > 0 && p.getHeightHint() > 0) {
                w.setPixelSize(p.getWidthHint(), p.getHeightHint());
            }
        }
    }
}

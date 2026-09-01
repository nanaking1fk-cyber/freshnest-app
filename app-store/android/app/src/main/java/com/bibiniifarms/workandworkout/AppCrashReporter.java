package com.bibiniifarms.workandworkout;

import android.content.Context;
import android.os.Process;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

final class AppCrashReporter {
    private static final String REPORT_FILE = "pending-native-crash.json";
    private static final String ENDPOINT = "https://www.workandworkout.com/api/v18/client-error";
    private static boolean installed;

    private AppCrashReporter() {}

    static synchronized void install(Context context) {
        if (installed) return;
        installed = true;
        Context app = context.getApplicationContext();
        uploadPending(app);
        Thread.UncaughtExceptionHandler previous = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((thread, error) -> {
            writePending(app, error);
            if (previous != null) {
                previous.uncaughtException(thread, error);
            } else {
                Process.killProcess(Process.myPid());
                System.exit(10);
            }
        });
    }

    private static void writePending(Context context, Throwable error) {
        try {
            JSONObject report = new JSONObject();
            report.put("source", "native_crash");
            report.put("category", "native");
            report.put("release", BuildConfig.VERSION_NAME);
            report.put("surface", "android");
            report.put("route", "/native/android");
            report.put("errorName", error == null ? "NativeCrash" : error.getClass().getSimpleName());
            report.put("message", "Uncaught Android native exception");
            JSONArray frames = new JSONArray();
            if (error != null) {
                for (StackTraceElement frame : error.getStackTrace()) {
                    if (!frame.getClassName().startsWith("com.bibiniifarms.workandworkout")) continue;
                    frames.put(frame.getClassName() + "." + frame.getMethodName() + "(" + frame.getFileName() + ":" + frame.getLineNumber() + ")");
                    if (frames.length() >= 24) break;
                }
            }
            report.put("stack", frames.join("\n"));
            byte[] body = report.toString().getBytes(StandardCharsets.UTF_8);
            if (body.length > 16_384) return;
            try (FileOutputStream stream = new FileOutputStream(new File(context.getFilesDir(), REPORT_FILE), false)) {
                stream.write(body);
                stream.getFD().sync();
            }
        } catch (Exception ignored) {
            // A crash reporter must never interfere with the platform handler.
        }
    }

    private static void uploadPending(Context context) {
        new Thread(() -> {
            File file = new File(context.getFilesDir(), REPORT_FILE);
            if (!file.isFile() || file.length() <= 0 || file.length() > 16_384) return;
            HttpURLConnection connection = null;
            try {
                byte[] body = read(file);
                connection = (HttpURLConnection) new URL(ENDPOINT).openConnection();
                connection.setConnectTimeout(8_000);
                connection.setReadTimeout(8_000);
                connection.setRequestMethod("POST");
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setRequestProperty("X-Work-Workout-Native", "android");
                connection.setFixedLengthStreamingMode(body.length);
                try (OutputStream stream = connection.getOutputStream()) { stream.write(body); }
                int status = connection.getResponseCode();
                if (status >= 200 && status < 300) file.delete();
            } catch (Exception ignored) {
                // Keep the private file and try again on the next app launch.
            } finally {
                if (connection != null) connection.disconnect();
            }
        }, "work-workout-crash-upload").start();
    }

    private static byte[] read(File file) throws Exception {
        try (FileInputStream input = new FileInputStream(file); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4_096];
            int count;
            while ((count = input.read(buffer)) != -1 && output.size() <= 16_384) output.write(buffer, 0, count);
            return output.toByteArray();
        }
    }
}

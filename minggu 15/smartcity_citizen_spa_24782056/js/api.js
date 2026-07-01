const LOCAL_API_BASE_URL = "http://127.0.0.1:8000";
const PUBLIC_API_BASE_URL = "http://103.151.63.86:8006";

function getApiBaseUrl() {
    const hostname = window.location.hostname;
    const isLocalFrontend = hostname === "127.0.0.1" || hostname === "localhost" || hostname === "";

    if (isLocalFrontend) {
        return LOCAL_API_BASE_URL;
    }

    return PUBLIC_API_BASE_URL;
}

const API_BASE_URL = getApiBaseUrl();

function clearAuthStorage() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    localStorage.removeItem("user_role");
}

function syncApiEnvironment() {
    const lastApiBaseUrl = localStorage.getItem("api_base_url");

    if (lastApiBaseUrl && lastApiBaseUrl !== API_BASE_URL) {
        clearAuthStorage();
    }

    localStorage.setItem("api_base_url", API_BASE_URL);
    console.info("API aktif:", API_BASE_URL);
}

syncApiEnvironment();

async function requestAPI(endpoint, method = "GET", bodyData = null) {
    const accessToken = localStorage.getItem("access_token");

    const headers = {
        "Content-Type": "application/json"
    };

    if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const options = {
        method: method,
        headers: headers
    };

    if (bodyData !== null) {
        options.body = JSON.stringify(bodyData);
    }

    const endpointPath = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const response = await fetch(`${API_BASE_URL}${endpointPath}`, options);

    const contentType = response.headers.get("content-type") || "";
    let data = {};

    if (contentType.includes("application/json")) {
        data = await response.json().catch(() => ({}));
    } else {
        const text = await response.text().catch(() => "");
        data = { detail: text || response.statusText };
    }

    if (response.status === 401) {
        clearAuthStorage();
    }

    if (!response.ok) {
        throw {
            status: response.status,
            data: data
        };
    }

    return {
        status: response.status,
        data: data
    };
}
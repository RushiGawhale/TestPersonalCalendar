/************************
 * SUPABASE CONFIG
 ************************/
const SUPABASE_URL = "https://ubrpgbnspdlgpcdlwluc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVicnBnYm5zcGRsZ3BjZGx3bHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjEyNTEsImV4cCI6MjA4MjU5NzI1MX0.iTV99bkvPjwpbm1qM9TgHfqoL0Zs6u2u0OLqmCnwDw4";
const EVENTS_TABLE = "PersonalCalendarEvents";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/************************
 * PASSWORD (EDIT PAGE)
 ************************/
const PASSWORD = "mySecret123";

window.checkPassword = function () {
  const input = document.getElementById("passwordInput").value;
  const error = document.getElementById("authError");

  if (input === PASSWORD) {
    document.getElementById("authOverlay").style.display = "none";
  } else {
    error.innerText = "Wrong password ❌";
  }
};

/************************
 * GLOBAL STATE
 ************************/
let calendar;
let selectedDate = null;
let editingEvent = null;

const eventColors = [
  "#1e3a8a",
  "#7c2d12",
  "#065f46",
  "#581c87",
  "#9f1239"
];

/************************
 * TIME DROPDOWNS
 ************************/
function populateTimeDropdowns() {
  const from = document.getElementById("eventFrom");
  const to = document.getElementById("eventTo");

  from.innerHTML = "";
  to.innerHTML = "";

  for (let h = 0; h < 24; h++) {
    for (let m of ["00", "30"]) {
      const time = `${String(h).padStart(2, "0")}:${m}`;
      from.add(new Option(time, time));
      to.add(new Option(time, time));
    }
  }

  from.value = "10:00";
  to.value = "11:00";
}

/************************
 * LOAD EVENTS
 ************************/
async function loadEvents() {
  const { data, error } = await supabaseClient
    .from(EVENTS_TABLE)
    .select("*");

  if (error) {
    console.error("Load events error:", error);
    return [];
  }

  return data;
}

/************************
 * MODAL CONTROLS
 ************************/
window.closeModal = function () {
  editingEvent = null;
  document.getElementById("deleteBtn").style.display = "none";
  document.getElementById("eventModal").style.display = "none";
};

window.saveEvent = async function () {
  const title = document.getElementById("eventTitle").value.trim();
  const from = document.getElementById("eventFrom").value;
  const to = document.getElementById("eventTo").value;

  if (!title || !from || !to) {
    alert("Please fill all fields");
    return;
  }

  // ✅ FIX #1 + #2 — stable ISO datetime (local time, with seconds)
  const startDateTime = `${selectedDate}T${from}:00`;
  const endDateTime = `${selectedDate}T${to}:00`;

  // ✅ FIX #3 — prevent FullCalendar auto-correct
  if (endDateTime <= startDateTime) {
    alert("End time must be after start time");
    return;
  }

  const color =
    editingEvent?.backgroundColor ||
    eventColors[Math.floor(Math.random() * eventColors.length)];

  if (editingEvent) {
    // UPDATE
    editingEvent.setProp("title", title);
    editingEvent.setStart(startDateTime);
    editingEvent.setEnd(endDateTime);

    const { error } = await supabaseClient
      .from(EVENTS_TABLE)
      .update({
        title,
        start: startDateTime,
        end: endDateTime,
        color
      })
      .eq("id", editingEvent.id);

    if (error) {
      console.error("Update error:", error);
    }
  } else {
    // INSERT
    const { data, error } = await supabaseClient
      .from(EVENTS_TABLE)
      .insert({
        title,
        start: startDateTime,
        end: endDateTime,
        color
      })
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error);
      return;
    }

    calendar.addEvent({
      id: data.id,
      title: data.title,
      start: data.start,
      end: data.end,
      color: data.color
    });
  }

  closeModal();
};

window.deleteEvent = async function () {
  if (!editingEvent) return;

  if (!confirm("Delete this event?")) return;

  const { error } = await supabaseClient
    .from(EVENTS_TABLE)
    .delete()
    .eq("id", editingEvent.id);

  if (error) {
    console.error("Delete error:", error);
    return;
  }

  editingEvent.remove();
  editingEvent = null;
  closeModal();
};

/************************
 * CALENDAR INIT
 ************************/
document.addEventListener("DOMContentLoaded", async function () {
  populateTimeDropdowns();

  const calendarEl = document.getElementById("calendar");
  const events = await loadEvents();

  calendar = new FullCalendar.Calendar(calendarEl, {
    timeZone: "local", // ✅ FIX #1
    initialView: "dayGridMonth",

    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: ""
    },

    events: events,

    dateClick(info) {
      selectedDate = info.dateStr;
      editingEvent = null;

      document.getElementById("eventTitle").value = "";
      document.getElementById("eventFrom").value = "10:00";
      document.getElementById("eventTo").value = "11:00";
      document.getElementById("deleteBtn").style.display = "none";

      document.getElementById("eventModal").style.display = "flex";
    },

    eventClick(info) {
      editingEvent = info.event;

      const start = info.event.start;
      const end = info.event.end;

      selectedDate = start.toISOString().split("T")[0];

      document.getElementById("eventTitle").value = info.event.title;
      document.getElementById("eventFrom").value =
        start.toTimeString().slice(0, 5);
      document.getElementById("eventTo").value =
        end.toTimeString().slice(0, 5);

      document.getElementById("deleteBtn").style.display = "inline-block";
      document.getElementById("eventModal").style.display = "flex";
    }
  });

  calendar.render();
});

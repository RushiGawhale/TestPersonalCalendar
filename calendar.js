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
 * PASSWORD
 ************************/
const PASSWORD = "mySecret123";

/************************
 * GLOBAL STATE
 ************************/
let calendar;
let selectedDate = null;
let editingEvent = null;

const eventColors = [
  "#1e3a8a",
  "#065f46",
  "#7c2d12",
  "#581c87",
  "#9f1239"
];

const allDayColor = "#6b7280";

/************************
 * PASSWORD ENTER SUPPORT
 ************************/
window.checkPassword = function () {
  const input = document.getElementById("passwordInput").value;
  const error = document.getElementById("authError");

  if (input === PASSWORD) {
    document.getElementById("authOverlay").style.display = "none";
  } else {
    error.innerText = "Wrong password ❌";
  }
};

window.handlePasswordEnter = function (e) {
  if (e.key === "Enter") {
    checkPassword();
  }
};

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

  from.value = "09:00";
  to.value = "18:00";
}

/************************
 * LOAD EVENTS
 ************************/
async function loadEvents() {
  const { data, error } = await supabaseClient
    .from(EVENTS_TABLE)
    .select("*");

  if (error) {
    console.error(error);
    return [];
  }

  return data.map(e => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    allDay: e.all_day,
    color: e.all_day ? allDayColor : e.color
  }));
}

/************************
 * ALL DAY TOGGLE
 ************************/
window.toggleAllDay = function () {
  const isAllDay = document.getElementById("allDayCheckbox").checked;
  document.getElementById("eventFrom").disabled = isAllDay;
  document.getElementById("eventTo").disabled = isAllDay;
};

/************************
 * MODAL CONTROLS
 ************************/
window.closeModal = function () {
  editingEvent = null;
  document.getElementById("eventModal").style.display = "none";
};

window.saveEvent = async function () {
  const title = document.getElementById("eventTitle").value.trim();
  const isAllDay = document.getElementById("allDayCheckbox").checked;
  const from = document.getElementById("eventFrom").value;
  const to = document.getElementById("eventTo").value;

  if (!title) {
    alert("Event title required");
    return;
  }

  let start, end;

  if (isAllDay) {
    start = selectedDate;
    end = null;
  } else {
    start = `${selectedDate}T${from}:00`;
    end = `${selectedDate}T${to}:00`;

    if (end <= start) {
      alert("End time must be after start time");
      return;
    }
  }

  const color = isAllDay
    ? allDayColor
    : eventColors[Math.floor(Math.random() * eventColors.length)];

  if (editingEvent) {
    editingEvent.setProp("title", title);
    editingEvent.setAllDay(isAllDay);
    editingEvent.setStart(start);
    editingEvent.setEnd(end);
    editingEvent.setProp("backgroundColor", color);

    await supabaseClient
      .from(EVENTS_TABLE)
      .update({
        title,
        start,
        end,
        all_day: isAllDay,
        color
      })
      .eq("id", editingEvent.id);
  } else {
    const { data } = await supabaseClient
      .from(EVENTS_TABLE)
      .insert({
        title,
        start,
        end,
        all_day: isAllDay,
        color
      })
      .select()
      .single();

    calendar.addEvent({
      id: data.id,
      title,
      start,
      end,
      allDay: isAllDay,
      color
    });
  }

  closeModal();
};

window.deleteEvent = async function () {
  if (!editingEvent) return;
  if (!confirm("Delete this event?")) return;

  await supabaseClient
    .from(EVENTS_TABLE)
    .delete()
    .eq("id", editingEvent.id);

  editingEvent.remove();
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
    timeZone: "local",
    initialView: "dayGridMonth",
    events,

    dateClick(info) {
      selectedDate = info.dateStr;
      editingEvent = null;

      document.getElementById("eventTitle").value = "";
      document.getElementById("allDayCheckbox").checked = false;
      toggleAllDay();

      document.getElementById("eventModal").style.display = "flex";
    },

    eventClick(info) {
      editingEvent = info.event;
      selectedDate = info.event.startStr.split("T")[0];

      document.getElementById("eventTitle").value = info.event.title;
      document.getElementById("allDayCheckbox").checked = info.event.allDay;
      toggleAllDay();

      if (!info.event.allDay) {
        document.getElementById("eventFrom").value =
          info.event.start.toTimeString().slice(0, 5);
        document.getElementById("eventTo").value =
          info.event.end.toTimeString().slice(0, 5);
      }

      document.getElementById("eventModal").style.display = "flex";
    }
  });

  calendar.render();
});

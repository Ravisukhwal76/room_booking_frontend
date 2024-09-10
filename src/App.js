import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./App.css"; // Updated with new styles

function App() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [session, setSession] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [message, setMessage] = useState("");

  const getTagsByRoomName = (roomName) => {
    switch (roomName) {
      case "Conference Room 1":
        return ["Projector", "Whiteboard", "15 Seats"];
      case "Meeting Room A":
        return ["Video Conferencing", "8 Seats"];
      case "Auditorium":
        return ["Premium", "Private", "5 Seats"];
      default:
        return ["Standard", "10 Seats"];
    }
  };

  const fetchRooms = useCallback(() => {
    axios
      .get("http://localhost:5000/rooms")
      .then((res) => {
        const roomsWithTags = res.data.map((room) => ({
          ...room,
          tags: getTagsByRoomName(room.name),
        }));
        setRooms(roomsWithTags);
        if (roomsWithTags.length > 0) setSelectedRoom(roomsWithTags[0]);
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    axios
      .get("http://localhost:5000/generate-session")
      .then((res) => setSession(res.data))
      .catch((err) => console.error(err));

    fetchRooms();
  }, [fetchRooms]);

  const handleSearch = () => {
    if (!searchQuery) {
      fetchRooms(); // Fetch all rooms if search query is empty
      return;
    }

    axios
      .get(`http://localhost:5000/rooms/search?query=${searchQuery}`)
      .then((res) => setRooms(res.data))
      .catch((err) => console.error(err));
  };

  const handleBookRoom = (roomId, date, timeSlot) => {
    const bookingExists = selectedRoom.bookings.some(
      (b) => b.date === date && b.timeSlot === timeSlot
    );

    if (bookingExists) {
      setMessage("This slot is already booked.");
      return;
    }

    const currentTime = new Date();
    const bookingTime = new Date(`${date} ${timeSlot.split("-")[0]}`);

    if (bookingTime <= currentTime) {
      setMessage("Cannot book a slot in the past.");
      return;
    }

    axios
      .post(`http://localhost:5000/rooms/${roomId}/book`, {
        date,
        timeSlot,
        bookedBy: session.sessionId,
      })
      .then(() => {
        fetchRooms();
        setMessage("Booking successful!");
      })
      .catch((err) => console.error(err));
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setMessage("");
    fetchAvailableTimeSlots(selectedRoom._id, date);
  };

  const fetchAvailableTimeSlots = (roomId, date) => {
    const timeSlots = [
      "09:00-10:00",
      "10:00-11:00",
      "11:00-12:00",
      "14:00-15:00",
    ];
    setAvailableTimeSlots(timeSlots);
  };

  const handleSlotClick = (slot) => {
    setSelectedSlot(slot);
    setMessage("");
  };

  return (
    <div className="app">
      <header className="app-header">
        <input
          type="text"
          className="search-input"
          placeholder="Search Rooms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button className="btn btn-search" onClick={handleSearch}>
          Search
        </button>
      </header>

      <div className="container">
        <div className="sidebar">
          {rooms.map((room) => (
            <div
              key={room._id}
              className={`room-card ${
                selectedRoom && selectedRoom._id === room._id ? "selected" : ""
              }`}
              onClick={() => setSelectedRoom(room)}
            >
              <div className="room-name">{room.name}</div>
              <div className="tags">
                {room.tags.map((tag, index) => (
                  <span key={index} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="details">
          {selectedRoom && (
            <div className="details-card">
              <h2>{selectedRoom.name}</h2>
              <div className="tags">
                {getTagsByRoomName(selectedRoom.name).map((tag, index) => (
                  <span key={index} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
              <Calendar onChange={handleDateChange} value={selectedDate} />

              <div className="time-slots">
                <h3>Available Time Slots on {selectedDate.toDateString()}</h3>
                {availableTimeSlots.map((slot) => {
                  const isBooked = selectedRoom.bookings.some(
                    (b) =>
                      b.date === selectedDate.toDateString() &&
                      b.timeSlot === slot
                  );

                  return (
                    <div
                      key={slot}
                      className={`time-slot ${
                        isBooked
                          ? "booked"
                          : selectedSlot === slot
                          ? "selected"
                          : ""
                      }`}
                    >
                      <span>{slot}</span>
                      <button
                        className="btn btn-slot"
                        disabled={isBooked}
                        onClick={() =>
                          isBooked
                            ? setMessage("This slot is already booked.")
                            : handleSlotClick(slot)
                        }
                      >
                        {isBooked ? "Booked" : "Select"}
                      </button>
                    </div>
                  );
                })}

                {selectedSlot && (
                  <button
                    className="btn btn-book"
                    onClick={() =>
                      handleBookRoom(
                        selectedRoom._id,
                        selectedDate.toDateString(),
                        selectedSlot
                      )
                    }
                  >
                    Book Selected Slot
                  </button>
                )}
              </div>

              <div>
                <h3>Bookings</h3>
                {selectedRoom.bookings.map((booking) => (
                  <div
                    key={`${booking.date}-${booking.timeSlot}`}
                    style={{
                      color:
                        booking.bookedBy === session.sessionId
                          ? "red"
                          : "black",
                    }}
                  >
                    {booking.date} - {booking.timeSlot} ({booking.bookedBy})
                  </div>
                ))}
              </div>
              {message && <p className="message">{message}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

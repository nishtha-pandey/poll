"use client"

import { useEffect, useState, useRef } from "react"
import { MessageCircle } from "lucide-react"
import SocketService, { ChatMessage, Participant } from "@/lib/socket"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface ChatWidgetProps {
  role: "teacher" | "student"
  displayName: string
}

export function ChatWidget({ role, displayName }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"chat" | "participants">("chat")
  const [messageInput, setMessageInput] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const socketService = SocketService.getInstance()
    const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const WELCOME_MESSAGE: ChatMessage = {
    senderRole: role === "teacher" ? "teacher" : "student",
    senderName: "Intervue Poll",
    message:
      role === "teacher"
        ? "Welcome! Students can message you here."
        : "Hey There, how can I help?",
  }
  const allMessages = [WELCOME_MESSAGE, ...messages]

  useEffect(() => {
    socketService.connect()

    socketService.onChatMessage((msg) => {
      setMessages((prev) => [...prev, msg])
    })

    socketService.onParticipantsUpdated((list) => {
      setParticipants(list)
    })

    return () => {
      socketService.offChatMessage()
      socketService.offParticipantsUpdated()
    }
  }, [socketService])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const handleSendMessage = () => {
    const trimmed = messageInput.trim()
    if (!trimmed) return

    const payload: ChatMessage = {
      senderRole: role,
      senderName: displayName || (role === "teacher" ? "Teacher" : "Student"),
      message: trimmed,
    }

    socketService.sendChatMessage(payload)
    setMessageInput("")
  }

  const handleKick = (studentId: string) => {
    if (role !== "teacher") return
    socketService.kickStudent(studentId)
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {isOpen && (
        <div className="mb-4 w-[429px] h-[477px] bg-white rounded-xl shadow-xl border border-[#e6e6e6] overflow-hidden flex flex-col">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "chat" | "participants")}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="px-4 pt-3 pb-0 border-b bg-white shrink-0">
              <TabsList className="bg-transparent p-0 h-auto flex space-x-6">
                <TabsTrigger
                  value="chat"
                  className="relative px-0 pb-3 text-xs font-medium text-[#777777] data-[state=active]:text-[#000000] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Chat
                  {activeTab === "chat" && (
                    <div className="absolute left-1/2 -bottom-[2px] h-[3px] w-16 -translate-x-1/2 rounded-full bg-[#7765DA]" />
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="participants"
                  className="relative px-0 pb-3 text-xs font-medium text-[#777777] data-[state=active]:text-[#000000] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Participants
                  {activeTab === "participants" && (
                    <div className="absolute left-1/2 -bottom-[2px] h-[3px] w-16 -translate-x-1/2 rounded-full bg-[#7765DA]" />
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 m-0">
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 text-sm">
                  {allMessages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex flex-col ${
                        msg.senderName === displayName ? "items-end" : "items-start"
                      }`}
                    >
                      <span className="text-[10px] text-[#666666] mb-0.5 font-medium">
                        {msg.senderName}
                        {msg.senderRole === "teacher" && " (Teacher)"}
                      </span>
                      <div
                        className={`max-w-[75%] rounded-lg px-3 py-2 text-xs ${
                          msg.senderName === displayName
                            ? "bg-[#7765DA] text-white"
                            : "bg-[#373737] text-white"
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div className="border-t px-3 py-2 flex gap-2 shrink-0">
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type a message..."
                    className="h-8 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-8 px-3 bg-[#7765DA] hover:bg-[#480fb3]"
                    onClick={handleSendMessage}
                  >
                    Send
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="participants" className="flex-1 flex flex-col min-h-0 m-0">
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 text-sm">
                  {participants.length === 0 ? (
                    <p className="text-center text-[#9b9b9b] text-xs">
                      No students have joined yet.
                    </p>
                  ) : (
                    participants.map((p) => (
                      <div
                        key={p.studentId}
                        className="flex items-center justify-between px-2 py-1 rounded-md hover:bg-[#f5f5f5]"
                      >
                        <span className="text-xs text-[#272727]">{p.studentName}</span>
                        {role === "teacher" && (
                          <button
                            className="text-[11px] text-[#5767D0] hover:underline"
                            onClick={() => handleKick(p.studentId)}
                          >
                            Kick out
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      <Button
        className="rounded-full w-12 h-12 bg-[#7765DA] hover:bg-[#480fb3] shadow-lg"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <MessageCircle className="w-5 h-5" />
      </Button>
    </div>
  )
}


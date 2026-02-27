"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, Users, Clock, CheckCircle, Sparkles } from "lucide-react"
import { pollAPI } from "@/lib/api"
import SocketService from "@/lib/socket"
import { ChatWidget } from "@/components/ChatWidget"

interface PollOption {
  id: number;
  text: string;
  isCorrect?: boolean;
}

interface ActivePoll {
  _id?: string;
  id?: string;
  question: string;
  options: PollOption[];
  timeLimit: number;
  timeRemaining: number;
  totalVotes: number;
}

export default function StudentPage() {
  const router = useRouter()
  const [selectedAnswer, setSelectedAnswer] = useState("")
  const [activePoll, setActivePoll] = useState<ActivePoll | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [socketService] = useState(() => SocketService.getInstance())
  const [studentId, setStudentId] = useState("")
  const [studentName, setStudentName] = useState("")
  const [pollHistory, setPollHistory] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    if (typeof window === 'undefined') return
    
    const storedName = localStorage.getItem('studentName')
    const storedId = localStorage.getItem('studentId')
    
    console.log('Checking stored credentials:', { storedName, storedId })
    
    if (!storedName || !storedId) {
      console.log('No credentials found, redirecting to login')
      router.replace('/loginpage?role=student')
      return
    }
    
    console.log('Credentials found, setting up student page')
    setStudentName(storedName)
    setStudentId(storedId)

    socketService.connect()

    socketService.onNewPoll((pollData: any) => {
      console.log('Received new poll from socket:', pollData);
      setActivePoll(pollData)
      setTimeRemaining(pollData.timeRemaining)
      setSelectedAnswer("")
      setHasSubmitted(false)
      setShowHistory(false)
      fetchPollHistory()
    })

    socketService.onPollEnded(() => {
      setActivePoll(null)
      setTimeRemaining(0)
      setShowHistory(false)
      fetchPollHistory() 
    })

   
    socketService.onKicked(() => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("studentName")
        localStorage.removeItem("studentId")
      }
      router.replace("/kicked")
    })

    
    socketService.studentJoin(storedId, storedName)

    checkActivePoll()
    fetchPollHistory()

    return () => {
      socketService.offNewPoll()
      socketService.offPollEnded()
      socketService.offKicked()
      socketService.studentLeave()
      socketService.disconnect()
    }
  }, [socketService])

  useEffect(() => {
    if (activePoll && timeRemaining > 0 && !hasSubmitted) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setShowHistory(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [activePoll, timeRemaining, hasSubmitted])

  const fetchPollHistory = async () => {
    try {
      const history = await pollAPI.getAllPolls()
      console.log('Raw poll history from API:', history)
      
      const sortedHistory = history.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        console.log(`Comparing ${a.question} (${dateA}) vs ${b.question} (${dateB})`)
        return dateB - dateA
      })
      
      console.log('Sorted poll history:', sortedHistory)
      setPollHistory(sortedHistory)
    } catch (error) {
      console.error('Error fetching poll history:', error)
    }
  }

  const checkActivePoll = async () => {
    try {
      const poll = await pollAPI.getActivePoll()
      console.log('Received active poll from API:', poll);
      if (poll) {
        setActivePoll(poll)
        setTimeRemaining(poll.timeRemaining || 0)
        setHasSubmitted(false)
        setShowHistory(false)
      } else {
        setActivePoll(null)
        setShowHistory(false)
      }
    } catch (error) {
      console.error('Error checking active poll:', error)
      setActivePoll(null)
      setShowHistory(false)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !activePoll || isSubmitting) return

    console.log('Active poll object:', activePoll);
    console.log('Poll ID:', activePoll._id);
    console.log('Poll ID (id field):', activePoll.id);

    setIsSubmitting(true)
    try {
      const pollId = activePoll._id || activePoll.id;
      if (!pollId) {
        console.error('No poll ID found in active poll:', activePoll);
        alert('Error: No poll ID found');
        return;
      }

      await pollAPI.submitResponse(pollId, {
        selectedOption: parseInt(selectedAnswer),
        studentId: studentId,
        studentName: studentName
      })
      
      fetchPollHistory()
      setHasSubmitted(true)
    } catch (error: any) {
      console.error('Error submitting answer:', error)
      alert(error.error || "Failed to submit answer")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="animate-spin w-8 h-8 border-4 border-[#7765DA] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-[#454545]">Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="animate-spin w-8 h-8 border-4 border-[#7765DA] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-[#454545]">Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!activePoll && !showHistory) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
        <div className="flex flex-col items-center mb-8">
          <Badge className="bg-gradient-to-r from-[#7765DA] to-[#4F0DCE] text-white px-4 py-1.5 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Intervue Poll
          </Badge>
          <div className="mt-8 mb-4">
            <div className="w-10 h-10 border-4 border-[#4F0DCE] border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-lg font-semibold text-[#000000]">
            Wait for the teacher to ask questions..
          </p>
          <Button
            className="mt-6 px-6 py-2 rounded-full bg-gradient-to-r from-[#7765DA] to-[#4F0DCE] text-white text-sm shadow-md hover:opacity-90"
            onClick={() => setShowHistory(true)}
          >
            Review previous questions
          </Button>
        </div>
        <ChatWidget role="student" displayName={studentName} />
      </div>
    )
  }

  if (showHistory) {
    return (
      <div className="min-h-screen p-4 relative">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Badge className="bg-[#7765DA] text-white">Student View</Badge>
              <span className="text-sm text-[#454545]">Review previous questions</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setShowHistory(false)}
            >
              Back to waiting
            </Button>
          </div>

          {pollHistory.length === 0 ? (
            <Card className="w-full max-w-2xl mx-auto text-center">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-[#f1f1f1] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-[#454545]" />
                </div>
                <p className="text-[#454545]">No questions have been posted yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pollHistory.map((poll, index) => (
                <Card key={poll._id} className="w-full max-w-2xl mx-auto">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg text-[#000000] mb-2">
                          Question {index + 1}: {poll.question}
                        </CardTitle>
                        <div className="flex items-center gap-4 text-sm text-[#454545]">
                          <span>Time Limit: {poll.timeLimit}s</span>
                          <span>Total Votes: {poll.totalVotes || 0}</span>
                          <span>
                            Posted: {new Date(poll.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <Badge variant={poll.isActive ? "default" : "secondary"}>
                        {poll.isActive ? "Active" : "Closed"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {poll.options?.map((option: any) => (
                        <div
                          key={option.id}
                          className={`p-3 rounded-lg border ${
                            option.isCorrect
                              ? "bg-green-50 border-green-200"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">
                              {String.fromCharCode(64 + option.id)}. {option.text}
                            </span>
                            <div className="flex items-center gap-2">
                              {option.isCorrect && (
                                <Badge className="bg-green-500 text-white text-xs">
                                  Correct
                                </Badge>
                              )}
                              <span className="text-sm text-[#454545]">
                                {option.votes || 0} votes
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        <ChatWidget role="student" displayName={studentName} />
      </div>
    )
  }

  if (activePoll && !showHistory) {
    return (
      <div className="min-h-screen p-8 relative">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
                <ChevronLeft className="w-4 h-4 text-black" />
              </Button>
              <div>
                <h1 className="text-[26px] font-bold text-black">Question 1</h1>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <Clock className="w-[18px] h-[18px] text-black" />
                 <span className="text-red-500 font-semibold text-sm">
                    {formatTime(timeRemaining)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="w-full max-w-2xl rounded-xl border border-[#E6E6E6] bg-white shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-[#373737] to-[#373737] text-white px-6 py-3 rounded-t-xl">
                <p className="text-sm font-medium">
                  {activePoll.question}
                </p>
              </div>
              <div className="px-6 py-6 space-y-3 bg-[#FFFFFF]">
                {activePoll.options.map((option) => {
                  const isSelected = selectedAnswer === option.id.toString()
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedAnswer(option.id.toString())}
                      className={`w-full flex items-center gap-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "border-[#7765DA] bg-[#F2F2F2]"
                          : "border-[#E6E6E6] bg-[#F7F7F7]"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-semibold ${
                          isSelected ? "bg-[#7765DA] text-white" : "bg-[#E6E6E6] text-[#373737]"
                        }`}
                      >
                        {option.id}
                      </div>
                      <span className="py-3 pr-4 text-sm text-[#373737]">
                        {option.text}
                      </span>
                    </button>
                  )
                })}
               
              </div>
            </div>
          </div>
          {hasSubmitted && (
                  <p className="mt-6 text-center text-lg font-bold text-black">
                    Wait for the teacher to ask a new question..
                  </p>
                )}
          <div className="flex justify-center mt-8">
            <Button
              className="px-12 py-3 rounded-full bg-gradient-to-r from-[#7765DA] to-[#4F0DCE] text-white shadow-md hover:opacity-90"
              disabled={!selectedAnswer || isSubmitting || timeRemaining <= 0 || hasSubmitted}
              onClick={handleSubmitAnswer}
            >
              {hasSubmitted
                ? "Submitted"
                : isSubmitting
                  ? "Submitting..."
                  : timeRemaining <= 0
                    ? "Time's Up!"
                    : "Submit"}
            </Button>
          </div>
        </div>
        <ChatWidget role="student" displayName={studentName} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-6">
          <div className="animate-spin w-8 h-8 border-4 border-[#7765DA] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-[#454545]">Loading...</p>
        </CardContent>
      </Card>
    </div>
  )
}

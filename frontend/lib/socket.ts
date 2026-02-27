import { io, Socket } from 'socket.io-client';

type ChatMessage = {
  senderRole: 'teacher' | 'student';
  senderName: string;
  message: string;
  timestamp?: string;
};

type Participant = {
  studentId: string;
  studentName: string;
};

class SocketService {
  private socket: Socket | null = null;
  private static instance: SocketService;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public connect(
    url: string = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001'
  ): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(url, {
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to server:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    return this.socket;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  // Poll rooms
  public joinPoll(pollId: string): void {
    if (this.socket) {
      this.socket.emit('join-poll', pollId);
    }
  }

  public leavePoll(pollId: string): void {
    if (this.socket) {
      this.socket.emit('leave-poll', pollId);
    }
  }

  public onNewPoll(callback: (pollData: any) => void): void {
    if (this.socket) {
      this.socket.on('new-poll', callback);
    }
  }

  public onPollResultsUpdated(callback: (results: any) => void): void {
    if (this.socket) {
      this.socket.on('poll-results-updated', callback);
    }
  }

  public onPollEnded(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('poll-ended', callback);
    }
  }

  public offNewPoll(): void {
    if (this.socket) {
      this.socket.off('new-poll');
    }
  }

  public offPollResultsUpdated(): void {
    if (this.socket) {
      this.socket.off('poll-results-updated');
    }
  }

  public offPollEnded(): void {
    if (this.socket) {
      this.socket.off('poll-ended');
    }
  }

  // Participants
  public studentJoin(studentId: string, studentName: string): void {
    if (this.socket) {
      this.socket.emit('student-join', { studentId, studentName });
    }
  }

  public studentLeave(): void {
    if (this.socket) {
      this.socket.emit('student-leave');
    }
  }

  public onParticipantsUpdated(callback: (participants: Participant[]) => void): void {
    if (this.socket) {
      this.socket.on('participants-updated', callback);
    }
  }

  public offParticipantsUpdated(): void {
    if (this.socket) {
      this.socket.off('participants-updated');
    }
  }

  public kickStudent(studentId: string): void {
    if (this.socket) {
      this.socket.emit('kick-student', { studentId });
    }
  }

  public onKicked(callback: () => void): void {
    if (this.socket) {
      this.socket.on('kicked', callback);
    }
  }

  public offKicked(): void {
    if (this.socket) {
      this.socket.off('kicked');
    }
  }

  // Chat
  public sendChatMessage(message: ChatMessage): void {
    if (this.socket) {
      this.socket.emit('chat-message', message);
    }
  }

  public onChatMessage(callback: (msg: ChatMessage) => void): void {
    if (this.socket) {
      this.socket.on('chat-message', callback);
    }
  }

  public offChatMessage(): void {
    if (this.socket) {
      this.socket.off('chat-message');
    }
  }
}

export type { ChatMessage, Participant };
export default SocketService;
